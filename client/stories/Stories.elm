port module Stories exposing (main)

import Bulletproof
import Stories.Slider


port save_settings : String -> Cmd msg


main : Bulletproof.Program
main =
    Bulletproof.program save_settings
        [ Bulletproof.folder "Slider" Stories.Slider.stories
        ]
