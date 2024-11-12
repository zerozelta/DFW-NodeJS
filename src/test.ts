import { UploadedFile } from "express-fileupload";
import {
    DFWCore,
    DFWUtils,
    GETListener,
    POSTListener,
    RawListener,
} from ".";
import DFWSecurityController from "./controller/DFWSecurityController";
import DFWSessionController from "./controller/DFWSessionController";
import DFWUserController from "./controller/DFWUserController";
import UploadListener from "./listeners/UploadListener";
import DFWFileController from "./controller/DFWFileController";
import StaticDirectoryListener from "./listeners/StaticDirectoryListener";

var DFW = new DFWCore({
    server: {
        port: 300,
        trustProxy: true
    }
}).start()

DFW.register({
    api: {
        boot: GETListener(async ({ dfw }) => {
            return { user: dfw.user, isAuth: dfw.isAuthenticated() }
        }),
        bootstrap: [
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
        callback: GETListener(async ({ dfw }) => {
            dfw.addCallback(() => {
                DFWUtils.sleepAsync(2000).then(()=>{
                    console.log("Pasando!!", dfw.isAuthenticated())
                })
            })
            return { response: true }
        }),
        login: GETListener(async ({ dfw }, res) => {
            await dfw.session.login(await dfw.db.dfw_user.findUnique({ where: { id: 1 } }) as any)
            console.log(dfw.user)
            return { user: dfw.user, isAuth: dfw.isAuthenticated() }
        }),
        logout: GETListener(async (req, res) => {
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

            await DFWFileControl.saveUploadedFileAsync(file, {
                makeUrl: (filePath) => `/api/files/${filePath}`
            })

            return files
        }, {
            useTempFiles: true,
            tempFileDir: DFW.tmpDir
        }),
        files: StaticDirectoryListener(DFWCore.DFW_UPLOAD_DIR),
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