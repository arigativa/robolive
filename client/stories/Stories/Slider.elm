module Stories.Slider exposing (stories)

import Bulletproof exposing (Story)
import Html


stories : List Story
stories =
    [ Bulletproof.story "Example"
        (Html.text "Hello world"
            |> Bulletproof.fromHtml
        )
    ]
