module Stories.Slider exposing (stories)

import Bulletproof exposing (Story)
import Bulletproof.Knob
import Slider


stories : List Story
stories =
    [ Bulletproof.story "Default"
        (\min max initialValue ->
            { min = min
            , max = max
            , step = 1
            , initialValue = initialValue
            }
                |> Slider.int
                |> Slider.view
                |> Bulletproof.fromHtml
        )
        |> Bulletproof.Knob.int "Min" 0 []
        |> Bulletproof.Knob.int "Max" 100 []
        |> Bulletproof.Knob.int "Value" 50 []
    ]
