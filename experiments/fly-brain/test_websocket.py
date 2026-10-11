import asyncio
import json
import websockets
from bridge_server import handler

async def test_ws_end_to_end():
    # Start temporary test server on port 8769
    server = await websockets.serve(handler, "127.0.0.1", 8769)
    print("WebSocket server started on port 8769")

    async with websockets.connect("ws://127.0.0.1:8769") as ws:
        # 1. Handshake
        msg = await ws.recv()
        data = json.loads(msg)
        assert data["type"] == "handshake", f"Expected handshake, got {data}"
        print(f"Handshake OK: model={data.get('model')}")

        # 2. Perception -> Action
        perception = {
            "type": "perception",
            "data": {
                "left_hazard": 0.8,
                "right_hazard": 0.0,
                "center_hazard": 0.1,
                "yeti_proximity": 0.2
            }
        }
        await ws.send(json.dumps(perception))
        resp_msg = await ws.recv()
        resp = json.loads(resp_msg)
        assert resp["type"] == "action", f"Expected action, got {resp}"
        assert resp["steer"] > 0.2, f"Expected right turn, got {resp['steer']}"
        print(f"Action response OK: steer={resp['steer']:.2f}, telemetry={resp['telemetry']}")

    server.close()
    await server.wait_closed()
    print("ALL WEBSOCKET END-TO-END TESTS PASSED!")

if __name__ == "__main__":
    asyncio.run(test_ws_end_to_end())
