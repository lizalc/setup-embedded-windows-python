import type * as io from '@actions/io'
import { jest } from '@jest/globals'

export const rmRF = jest.fn<typeof io.rmRF>()
