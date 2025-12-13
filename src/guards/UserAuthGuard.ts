import { makeGuard } from "#makers/makeGuard";

export const UserAuthGuard = makeGuard(({ getSession }) => {
    if (getSession().isAuthenticated !== true) throw `ACCESS_DENIED`
})