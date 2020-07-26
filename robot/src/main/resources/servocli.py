#!/usr/bin/python3

# sudo pip3 install adafruit-circuitpython-pca9685
# sudo pip3 install adafruit-circuitpython-servokit

from adafruit_servokit import ServoKit
from board import SCL, SDA
import busio
from adafruit_pca9685 import PCA9685
import adafruit_motor.servo
import sys


i2c_bus = busio.I2C(SCL, SDA)
pca = PCA9685(i2c_bus)
pca.frequency = 50


servo = adafruit_motor.servo.Servo(pca)
kit = ServoKit(channels=16)

for line in sys.stdin:
    try:
        command, arguments_line = line.rstrip().split(' ', 1)
        arguments = arguments_line.split(' ')
        if command == 'servo':
            servo_idx, angle = arguments
            kit.servo[int(servo_idx)].angle = int(angle)
            print('OK')
        else:
            raise f'Unknown command: ${command}'
    except err:
        print(err)

