"""
bridge_server.py
Asynchronous WebSocket bridge connecting the 3D web game (Three.js) with
the Drosophila melanogaster Leaky Integrate-and-Fire (LIF) brain simulation.

Default Address: ws://127.0.0.1:8765
"""

import asyncio
import json
import logging
import sys
from drosophila_lif_sim import DrosophilaBrainModel

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [FlyBrain-Bridge] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S"
)
logger = logging.getLogger("FlyBrainBridge")

HOST = "127.0.0.1"
PORT = 8765


async def handler(websocket):
    logger.info("Cliente Three.js conectado a la simulación neuronal.")
    brain = DrosophilaBrainModel()

    try:
        # Enviar confirmación de bienvenida y telemetría inicial
        await websocket.send(json.dumps({
            "type": "handshake",
            "status": "connected",
            "model": "Drosophila_melanogaster_LIF",
            "circuit": "LPTC_RingAttractor_DN"
        }))

        async for message in websocket:
            try:
                payload = json.loads(message)
                msg_type = payload.get("type", "perception")

                if msg_type == "perception":
                    sensory_data = payload.get("data", {})
                    # Procesar ciclo neuronal en la Spiking Neural Network
                    output = brain.process(sensory_data)

                    # Devolver orden motora y telemetría de impulsos
                    response = {
                        "type": "action",
                        "steer": output["steer"],
                        "jump": output["jump"],
                        "turbo": output["turbo"],
                        "brake": output["brake"],
                        "telemetry": output["telemetry"]
                    }
                    await websocket.send(json.dumps(response))

                elif msg_type == "ping":
                    await websocket.send(json.dumps({"type": "pong"}))

            except json.JSONDecodeError:
                logger.warning("Mensaje JSON inválido recibido.")

    except Exception as e:
        logger.info(f"Conexión con el cliente cerrada: {e}")
    finally:
        logger.info("Cliente desconectado.")


async def main():
    try:
        import websockets
    except ImportError:
        logger.error("El módulo 'websockets' no está instalado. Ejecuta: pip install websockets")
        sys.exit(1)

    logger.info(f"Iniciando Servidor Puente Neuronal Drosophila en ws://{HOST}:{PORT}")
    async with websockets.serve(handler, HOST, PORT):
        logger.info("Listo para recibir conexiones desde el juego...")
        await asyncio.Future()  # Correr indefinidamente


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Servidor detenido por el usuario.")
