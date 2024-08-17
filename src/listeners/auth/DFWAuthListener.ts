import passport from "passport";
import { APIListener } from "../../types/APIListener";
import DFWSessionControler from "../../controller/DFWSessionController";

const DFWAuthListener: () => APIListener = () => {
    return {
        params: {
            middleware: [
                async (req, res, next) => {
                    passport.authenticate('dfw', (err, user: { id: number }) => {
                        if (err || !user) {
                            return res.status(401).json({ error: "ACCESS_DENIED" }).end()
                        }

                        req.login(user, { session: false }, async (err) => {
                            if (err) throw err
                            const SessionControl = new DFWSessionControler()
                            // Crear session
                            // mandar cookie
                        })
                    })(req, res, next)
                }
            ],
            method: 'post'
        }
    }
}

export default DFWAuthListener