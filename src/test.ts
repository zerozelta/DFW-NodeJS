import fileUpload, { FileArray, UploadedFile } from "express-fileupload";
import {
    DFWAuthListener,
    DFWCore,
    GETListener,
    POSTListener,
    RawListener,
} from ".";
import DFWSecurityController from "./controller/DFWSecurityController";
import DFWSessionController from "./controller/DFWSessionController";
import DFWUserController from "./controller/DFWUserController";
import UploadListener from "./listeners/UploadListener";
import DFWFileController from "./controller/DFWFileController";

var DFW = new DFWCore({
    server: {
        port: 300,
        trustProxy: true
    }
}).start()

DFW.register({
    api: {
        boot: [
            POSTListener(async ({ dfw, user }, res) => {
                return dfw.db.$transaction(async (db) => {
                    const SecurityControl = new DFWSecurityController().use(db)
                    const UserControl = new DFWUserController().use(db)

                    const conty = await UserControl.createUserAsync({
                        nick: 'conty',
                        password: 'test'
                    })

                    const adminCred = await SecurityControl.createCredentiaAsync("ADMIN")
                    const devCred = await SecurityControl.createCredentiaAsync("DEVELOPER")

                    const keyAcc = await SecurityControl.createAccessAsync("SMALL_KEY")

                    await SecurityControl.attachAccessToCredentialAsync(keyAcc, adminCred)
                    await SecurityControl.attachUserToCredentialAsync(user?.['id'], adminCred)

                    return { conty, adminCred, devCred, keyAcc }
                })
            })
        ],
        error: [
            GETListener(({ dfw }, res) => {
                throw "ERROR_HAS_BEEN_OCURRED"
            })
        ],
        raw: RawListener('get', (req, res, next) => {

        }),
        test: POSTListener(async (req, res) => {
            const SessionControl = new DFWSessionController()
            await SessionControl.updateSessionAgentAsync(req)

            return {
                isAuthenticated: req.isAuthenticated(),
                session: req.session,
                user: req.user
            }
        }),
        login: DFWAuthListener((req, res) => {
            return {
                isAuthenticated: req.isAuthenticated(),
                session: req.session,
                user: req.user
            }
        }),
        logout: POSTListener(async (req, res) => {
            const SessionControl = new DFWSessionController()
            await SessionControl.logoutAsync(req)
            //req.session = null as any
            return {
                isAuthenticated: req.isAuthenticated(),
                session: req.session,
                user: req.user
            }
        }),
        signup: POSTListener(async ({ dfw }) => {
            const UserControl = new DFWUserController()
            return UserControl.createUserAsync({
                nick: 'zerozelta',
                password: 'test'
            }).catch(() => { throw "UNABLE_TO_CREATE" })
        }),
        upload: UploadListener(async ({ dfw, files }) => {
            const { file } = files as { [key: string]: UploadedFile }
            const DFWFileControl = new DFWFileController()

            await DFWFileControl.saveLocalFileAsync(file,{ })

            return files
        }, {
            tempFileDir: './.dfw/temp',
            useTempFiles: true
        }),
        secured: [
            POSTListener(() => {
                return { access: true }
            })
        ]
    }
})

// Path protegido
DFW.addAccessValidator('/api/secured', async ({ dfw: { isAuthenticated, user } }) => {
    if (!isAuthenticated()) return false

    const SecurityControl = new DFWSecurityController()
    return SecurityControl.userHasCredentialAsync(user!.id, "ADMINO")
})