import { DFW } from "./test.dfw";

export const TestGuard = DFW.makeGuard(({ getSession }) => {
    console.log('validating...')
    if (getSession().isAuthenticated !== true) throw `ACCESS_DENIED`
})