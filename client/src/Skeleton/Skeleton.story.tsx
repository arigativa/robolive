import React from 'react'
import { number } from '@storybook/addon-knobs'
import { Box } from '@chakra-ui/react'

import { SkeletonText, SkeletonRect, SkeletonCircle } from '.'

export default {
  title: 'Skeleton'
}

export const Text: React.FC = () => (
  <Box fontSize={number('Font size', 14)}>
    <SkeletonText count={number('Count', 10)} />
  </Box>
)

export const Rect: React.FC = () => (
  <Box fontSize={number('Font size', 14)}>
    <SkeletonRect width={number('Width', 200)} height={number('Height', 100)} />
  </Box>
)

export const Circle: React.FC = () => (
  <Box fontSize={number('Font size', 14)}>
    <SkeletonCircle size={number('Size', 200)} />
  </Box>
)
