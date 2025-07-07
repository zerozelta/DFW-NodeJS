import { UploadedFile } from "express-fileupload";
import {
    DFWCore,
    DFWUtils,
    GETListener,
    POSTListener,
    RawListener,
} from ".";
import DFWSecurityRepository from "./repositories/security.repository";
import DFWSessionRepository from "./repositories/session.repository";
import DFWUserRepository from "./repositories/user.repository";
import DFWFileRepository from "./repositories/file.repository";
import StaticPathListener from "./listeners/StaticPathListener";

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
                    const SecurityControl = new DFWSecurityRepository().use(db)
                    const UserControl = new DFWUserRepository().use(db)

                    const conty = await UserControl.createUserAsync({
                        name: 'conty',
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
            const SessionControl = new DFWSessionRepository()
            await SessionControl.updateSessionAgentAsync(req)

            return {
                isAuthenticated: req.isAuthenticated(),
                session: req.session,
                user: req.user
            }
        }),
        callback: GETListener(async ({ dfw }) => {
            dfw.addCallback(async () => {
                await DFWUtils.sleepAsync(2000).then(() => {
                    console.log("Pasando!!1", dfw.isAuthenticated())
                })
                console.log("pasando!!1despues")
            })
            return { response: true }
        }, {
            callback: async ({ dfw }) => {
                await DFWUtils.sleepAsync(2000).then(() => {
                    console.log("Pasando!!2", dfw.isAuthenticated())
                })
            }
        }),
        login: GETListener(async ({ dfw }, res) => {
            const user = await dfw.db.dfw_user.findFirst()
            if (!user) throw "UNABLE_TO_FIND_USER"

            await dfw.session.login(user)
            console.log(dfw.user)
            return { user: dfw.user, isAuth: dfw.isAuthenticated() }
        }),
        logout: GETListener(async (req, res) => {
            const SessionControl = new DFWSessionRepository()
            await SessionControl.logoutAsync(req)
            //req.session = null as any
            return {
                isAuthenticated: req.isAuthenticated(),
                session: req.session,
                user: req.user
            }
        }),
        signup: POSTListener(async ({ dfw }) => {
            const UserControl = new DFWUserRepository()
            return UserControl.createUserAsync({
                name: 'zerozelta',
                password: 'test'
            }).catch(() => { throw "UNABLE_TO_CREATE" })
        }),
        upload: POSTListener(async ({ dfw, files }) => {
            const { file } = files as { [key: string]: UploadedFile }
            const DFWFileControl = new DFWFileRepository()

            await DFWFileControl.saveUploadedFileAsync(file, {
                makeUrl: (filePath) => `/api/files/${filePath}`
            })

            return files
        }, {
            upload: {
                useTempFiles: true,
                tempFileDir: DFW.tmpDir
            }
        }),
        files: StaticPathListener(DFWCore.DFW_UPLOAD_DIR),
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

    const SecurityControl = new DFWSecurityRepository()
    return SecurityControl.userHasCredentialAsync(user!.id, "ADMINO")
})