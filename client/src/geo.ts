import { Action, Effect } from 'core'

import Either from 'frctl/Either'
import Decode, { Decoder } from 'frctl/Json/Decode'

/**
 * Represents location coordinates
 */
export type Coordinates = {
  lat: number
  lon: number
}

const coordinatesDecoder: Decoder<Coordinates> = Decode.shape({
  lat: Decode.field('latitude').float,
  lon: Decode.field('longitude').float
})

/**
 * Gets current location via Browser API
 *
 * @param tagger function to transform location request results to an Aciton
 */
export const getCurrentLocation = <A extends Action>(
  tagger: (result: Either<string, Coordinates>) => A
): Effect<A> => dispatch => {
  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
      position => {
        const result = Decode.field('coords')
          .of(coordinatesDecoder)
          .decode(position)
          .mapLeft(decodeError => decodeError.stringify(4))

        return dispatch(tagger(result))
      },
      () => dispatch(tagger(Either.Left('Unable to retrieve your location')))
    )
  } else {
    dispatch(
      tagger(Either.Left('Geolocation is not supported by your browser'))
    )
  }
}
