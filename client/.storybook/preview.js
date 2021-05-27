import '../src/index.css'

import React from 'react'
import { CSSReset, ChakraProvider } from '@chakra-ui/react'
import { addDecorator } from '@storybook/react'

import { withKnobs } from '@storybook/addon-knobs'

addDecorator(withKnobs)

addDecorator(storyFn => (
  <ChakraProvider>
    <CSSReset />
    {storyFn()}
  </ChakraProvider>
))
