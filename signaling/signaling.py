#!/usr/bin/env python3.5
"""Websocket server programm

The purpose of this code is to assume the role of a signaling server 
in the process of a webrtc connection establishement
"""

import asyncio
import http

import websockets
import logging
import json


class SignalingServer:
    def __init__(self, logger):
        self.wait_for_robot = False
        self.server = None
        self.client = None
        self.robot = None
        self.logger = logger

    def serve(self, port):
        self.server = websockets.serve(self.ws_con_handler, '0.0.0.0', port, process_request=self.health_check)
        loop = asyncio.get_event_loop()

        try:
            loop.run_until_complete(self.server)
            loop.run_forever()
        except KeyboardInterrupt as e:
            print("Attempting graceful shutdown", flush=True)

            def shutdown_exception_handler(loop, context):
                if "exception" not in context \
                        or not isinstance(context["exception"], asyncio.CancelledError):
                    loop.default_exception_handler(context)

            loop.set_exception_handler(shutdown_exception_handler)

            tasks = asyncio.gather(*asyncio.Task.all_tasks(loop=loop), loop=loop, return_exceptions=True)
            tasks.add_done_callback(lambda t: loop.stop())
            tasks.cancel()

            while not tasks.done() and not loop.is_closed():
                loop.run_forever()
        finally:
            loop.close()

    async def handle_message(self, ws, msg):
        if ws == self.robot:
            self.logger.info('Send message to client')
            await self.client.send(json.dumps(msg))
        else:
            self.logger.info('Send message to robot')
            await self.robot.send(json.dumps(msg))

    async def connect_robot(self, ws):
        if self.robot is not None:
            raise Exception('Does not support multiple robots yet')
        self.robot = ws
        await self.robot.send('ROBOT_OK')
        self.logger.info('Robot connected')
        if self.wait_for_robot:
            await self.robot.send('READY')

    async def connect_client(self, ws):
        self.client = ws
        await ws.send('CLIENT_OK')
        self.logger.info('Client connected')
        if self.robot is None:
            self.wait_for_robot = True
        else:
            await self.robot.send('READY')

    async def ws_con_handler(self, ws, path):
        """Method that wait for websocket message
        and handle them in function of their actions
        """
        try:
            async for message in ws:
                if message == 'ROBOT':
                    await self.connect_robot(ws)
                elif message == 'CLIENT':
                    await self.connect_client(ws)
                else:
                    msg = json.loads(await ws.recv())
                    await self.handle_message(ws, msg)
        except websockets.exceptions.ConnectionClosed as e:
            self.logger.info("Connection closed")
        except Exception as e:
            self.logger.exception("Error while receiving messages")

    async def health_check(self, path, request_headers):
        if path == '/health':
            return http.HTTPStatus.OK, [], b"OK\n"


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)
    server = SignalingServer(logger)
    server.serve(5000)
