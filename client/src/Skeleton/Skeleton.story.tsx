import React from 'react'
import { number, boolean } from '@storybook/addon-knobs'
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
    <SkeletonRect
      inline={boolean('Inline', false)}
      width={number('Width', 200)}
      height={number('Height', 100)}
      rounded={number('Rounded', 3)}
    />
  </Box>
)

export const Circle: React.FC = () => (
  <Box fontSize={number('Font size', 14)}>
    <SkeletonCircle
      inline={boolean('Inline', false)}
      size={number('Size', 200)}
    />
  </Box>
)
