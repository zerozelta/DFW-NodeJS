export type * from "#types/index"
export * from "#lib/index"
export * from "#listeners/index"
export * from "#makers/index"
export * from "#guards/index"
export * from "#modules/index"

import passportModule from "passport";
import type { PassportStatic } from "passport";

export const passport: PassportStatic = passportModule;

export type {
  AuthenticateCallback,
  AuthenticateOptions,
  Authenticator,
  InitializeOptions,
  LogInOptions,
  LogOutOptions,
  PassportStatic,
  Profile,
  SessionOptions,
  Strategy,
  StrategyFailure,
} from "passport";