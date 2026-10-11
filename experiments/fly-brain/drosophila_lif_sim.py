"""
drosophila_lif_sim.py
Biologically grounded Leaky Integrate-and-Fire (LIF) Spiking Neural Network (SNN)
simulating the sensorimotor loop of Drosophila melanogaster based on the FlyWire connectome.

Circuit Architecture:
- Visual Motion / Optic Flow: LPTC (Lobula Plate Tangential Cells: Left & Right)
- Looming / Threat Avoidance: LPLC2 (Looming sensitive neurons responding to collision risk)
- Central Complex (Compass / Ring Attractor): Heading stabilization
- Descending Motor Neurons (DNs):
  * DNa01 / DNa02: Steering torque (left vs right steering bias)
  * DNp01: Deceleration / braking
  * GF (Giant Fiber): Escape jump & acrobatic evasion reflex
"""

import math
import numpy as np


class LIFNeuronGroup:
    """
    Vectorized Leaky Integrate-and-Fire neuron group.
    """
    def __init__(self, size: int, tau_m: float = 20.0, v_rest: float = -70.0,
                 v_reset: float = -75.0, v_thresh: float = -50.0, refractory_steps: int = 2):
        self.size = size
        self.tau_m = tau_m              # Membrane time constant (ms)
        self.v_rest = v_rest            # Resting potential (mV)
        self.v_reset = v_reset          # Reset potential (mV)
        self.v_thresh = v_thresh        # Spike threshold (mV)
        self.refractory_steps = refractory_steps

        self.v = np.full(size, v_rest, dtype=np.float32)
        self.refractory = np.zeros(size, dtype=np.int32)
        self.spikes = np.zeros(size, dtype=bool)

    def step(self, dt: float, current_input: np.ndarray) -> np.ndarray:
        """
        Integrates membrane potential and emits boolean spike vector.
        """
        # Decay and integrate for non-refractory neurons
        active_mask = (self.refractory <= 0)
        dv = (-(self.v[active_mask] - self.v_rest) + current_input[active_mask]) * (dt / self.tau_m)
        self.v[active_mask] += dv

        # Detect spikes
        self.spikes = self.v >= self.v_thresh
        self.v[self.spikes] = self.v_reset
        self.refractory[self.spikes] = self.refractory_steps

        # Decrement refractory counter for others
        self.refractory[self.refractory > 0] -= 1
        return self.spikes


class DrosophilaBrainModel:
    """
    Sensorimotor SNN circuit mapping sensory perceptions to motor commands.
    """
    def __init__(self):
        # 1. Sensory Population (16 neurons: 6 LPTC left, 6 LPTC right, 4 LPLC2 looming)
        self.sensory = LIFNeuronGroup(size=16, tau_m=12.0, v_thresh=-52.0)

        # 2. Central Complex / Interneurons (32 neurons: ring attractor and lateral horn)
        self.central = LIFNeuronGroup(size=32, tau_m=18.0, v_thresh=-50.0)

        # 3. Motor Descending Neurons (8 neurons:
        #    0-1: DNa01 Left, 2-3: DNa02 Right, 4-5: DNp01 Brake, 6-7: GF Giant Fiber Escape)
        self.motor = LIFNeuronGroup(size=8, tau_m=10.0, v_thresh=-48.0)

        # Synaptic Weight Matrices
        np.random.seed(42)
        # Sensory -> Central (Excitatory transmission)
        self.W_sc = np.random.uniform(8.0, 16.0, (16, 32)).astype(np.float32)
        # Asymmetrical lateral inhibition between left and right visual fields
        self.W_sc[:6, 16:] *= -0.5
        self.W_sc[6:12, :16] *= -0.5

        # Central -> Central (Recurrent ring attractor connectivity)
        self.W_cc = np.zeros((32, 32), dtype=np.float32)
        for i in range(32):
            for j in range(32):
                diff = abs(i - j)
                dist = min(diff, 32 - diff)
                # Mexican-hat connectivity: local excitation, global inhibition
                if dist <= 2:
                    self.W_cc[i, j] = 6.0 - (dist * 2.0)
                elif 3 <= dist <= 8:
                    self.W_cc[i, j] = -4.0

        # Central -> Motor
        self.W_cm = np.zeros((32, 8), dtype=np.float32)
        # Left central columns feed Left steering motor neurons (DNa01)
        self.W_cm[:16, 0:2] = 12.0
        # Right central columns feed Right steering motor neurons (DNa02)
        self.W_cm[16:, 2:4] = 12.0
        # High activity in central collision units triggers Brake (DNp01) and GF Escape
        self.W_cm[:, 4:6] = 5.0
        self.W_cm[:, 6:8] = 4.0

        # Direct fast reflex pathway (LPTC -> DNa steering and Looming -> Giant Fiber)
        self.W_reflex = np.zeros((16, 8), dtype=np.float32)
        self.W_reflex[:6, 0:2] = 16.0    # Left sensors -> DNa01 Left steering reflex
        self.W_reflex[6:12, 2:4] = 16.0  # Right sensors -> DNa02 Right steering reflex
        self.W_reflex[12:16, 6:8] = 25.0  # Direct Looming -> Giant Fiber jump trigger

        # Firing statistics and smoothing
        self.spike_history = {
            "sensory": 0,
            "central": 0,
            "motor_left": 0,
            "motor_right": 0,
            "escape_gf": 0,
        }

        # Postsynaptic currents (EPSC filters)
        self.i_central_syn = np.zeros(32, dtype=np.float32)
        self.i_motor_syn = np.zeros(8, dtype=np.float32)

    def process(self, sensory_dict: dict, sim_steps: int = 20, dt: float = 1.0) -> dict:
        """
        Executes internal LIF spikes across sensory, central, and motor layers.
        """
        left_h = float(sensory_dict.get("left_hazard", 0.0))
        right_h = float(sensory_dict.get("right_hazard", 0.0))
        center_h = float(sensory_dict.get("center_hazard", 0.0))
        yeti_p = float(sensory_dict.get("yeti_proximity", 0.0))
        goal = float(sensory_dict.get("goal_bias", 0.0))

        # Sensory currents (pA equivalent)
        sensory_i = np.zeros(16, dtype=np.float32)
        # 0..5: Left visual sensors (hazard on right, or steer left goal)
        sensory_i[0:6] = (right_h * 80.0) + max(0.0, -goal * 40.0)
        # 6..11: Right visual sensors (hazard on left, or steer right goal)
        sensory_i[6:12] = (left_h * 80.0) + max(0.0, goal * 40.0)
        # 12..15: Looming / Giant fiber triggers (center obstacle or Yeti closing in)
        sensory_i[12:16] = (center_h * 90.0) + (yeti_p * 110.0)

        motor_spikes_accum = np.zeros(8, dtype=np.int32)
        sensory_spikes_total = 0
        central_spikes_total = 0

        # Run LIF micro-ticks
        for _ in range(sim_steps):
            s_spikes = self.sensory.step(dt, sensory_i)
            sensory_spikes_total += int(np.sum(s_spikes))

            # Synaptic current decay and input accumulation (tau_syn = 6 ms)
            self.i_central_syn *= math.exp(-dt / 6.0)
            self.i_central_syn += (s_spikes.astype(np.float32) @ self.W_sc) + (self.central.spikes.astype(np.float32) @ self.W_cc)

            c_spikes = self.central.step(dt, self.i_central_syn)
            central_spikes_total += int(np.sum(c_spikes))

            self.i_motor_syn *= math.exp(-dt / 5.0)
            self.i_motor_syn += (c_spikes.astype(np.float32) @ self.W_cm) + (s_spikes.astype(np.float32) @ self.W_reflex)

            m_spikes = self.motor.step(dt, self.i_motor_syn)
            motor_spikes_accum += m_spikes.astype(np.int32)

        # Motor Output Decoding
        left_rate = float(motor_spikes_accum[0] + motor_spikes_accum[1])
        right_rate = float(motor_spikes_accum[2] + motor_spikes_accum[3])
        brake_rate = float(motor_spikes_accum[4] + motor_spikes_accum[5])
        gf_escape_rate = float(motor_spikes_accum[6] + motor_spikes_accum[7])

        # Differential steering: -1.0 (Left) to +1.0 (Right)
        rate_diff = right_rate - left_rate
        steer = math.tanh(rate_diff * 0.4)

        # Emergency Jump / Turbo (Giant Fiber trigger threshold)
        trigger_jump = bool(gf_escape_rate >= 4 and center_h > 0.6)
        trigger_turbo = bool(yeti_p > 0.5 or (gf_escape_rate >= 3 and center_h < 0.3))

        # Record telemetry
        self.spike_history = {
            "sensory": sensory_spikes_total,
            "central": central_spikes_total,
            "motor_left": int(left_rate),
            "motor_right": int(right_rate),
            "escape_gf": int(gf_escape_rate)
        }

        return {
            "steer": float(steer),
            "jump": trigger_jump,
            "turbo": trigger_turbo,
            "brake": bool(brake_rate > 5),
            "telemetry": {
                "sensorySpikes": sensory_spikes_total,
                "centralSpikes": central_spikes_total,
                "motorSpikesLeft": int(left_rate),
                "motorSpikesRight": int(right_rate),
                "giantFiberSpikes": int(gf_escape_rate),
                "membraneV": [round(float(v), 2) for v in self.motor.v[:4]]
            }
        }
