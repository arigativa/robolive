import '../src/index.css'

import React from 'react'
import { CSSReset, ThemeProvider, theme } from '@chakra-ui/core'
import { addDecorator } from '@storybook/react'

import { withKnobs } from '@storybook/addon-knobs'

addDecorator(withKnobs)

addDecorator(storyFn => (
  <ThemeProvider theme={theme}>
    <CSSReset />
    {storyFn()}
  </ThemeProvider>
))
