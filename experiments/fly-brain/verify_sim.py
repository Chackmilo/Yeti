import asyncio
import json
from drosophila_lif_sim import DrosophilaBrainModel

def test_dynamics():
    brain = DrosophilaBrainModel()
    
    # 1. Left hazard -> Contralateral right evasion
    res_left = brain.process({'left_hazard': 0.85, 'right_hazard': 0.0, 'center_hazard': 0.1})
    print(f"Turn on Left Hazard: steer={res_left['steer']:.2f}, spikesLeftMotor={res_left['telemetry']['motorSpikesLeft']}, spikesRightMotor={res_left['telemetry']['motorSpikesRight']}")
    assert res_left['steer'] > 0.2, "Must turn right"

    # 2. Right hazard -> Contralateral left evasion
    res_right = brain.process({'left_hazard': 0.0, 'right_hazard': 0.85, 'center_hazard': 0.1})
    print(f"Turn on Right Hazard: steer={res_right['steer']:.2f}, spikesLeftMotor={res_right['telemetry']['motorSpikesLeft']}, spikesRightMotor={res_right['telemetry']['motorSpikesRight']}")
    assert res_right['steer'] < -0.2, "Must turn left"

    # 3. Imminent center looming hazard -> Giant Fiber trigger
    res_center = brain.process({'left_hazard': 0.0, 'right_hazard': 0.0, 'center_hazard': 0.95})
    print(f"Looming Reflex: gfSpikes={res_center['telemetry']['giantFiberSpikes']}, jump={res_center['jump']}")
    assert res_center['telemetry']['giantFiberSpikes'] > 0, "Must trigger GF escape"

    print("ALL PYTHON SNN MODEL VERIFICATIONS PASSED SUCCESSFULLY!")

if __name__ == '__main__':
    test_dynamics()
