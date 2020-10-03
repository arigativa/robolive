import '../src/index.css'

import React from 'react'
import CssBaseline from '@material-ui/core/CssBaseline'
import { addDecorator } from '@storybook/react'
import { withKnobs } from '@storybook/addon-knobs'

addDecorator(withKnobs)

addDecorator(storyFn => <CssBaseline>{storyFn()}</CssBaseline>)
