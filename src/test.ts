import { DFWCore } from ".";
import DFWSessionControler from "./controller/DFWSessionController";
import DFWUserController from "./controller/DFWUserController";
import DFWAuthListener from "./listeners/auth/DFWAuthListener";
import GETListener from "./listeners/GETListener";
import POSTListener from "./listeners/POSTListener";
import RawListener from "./listeners/RawListener";

var DFW = new DFWCore({
    server: {
        port: 300,
        trustProxy: true
    }
}).start()

DFW.register({
    api: {
        print: [
            GETListener(({ dfw }, res) => {
                return 'holamundo'
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
            const SessionControl = new DFWSessionControler()
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
        signup: POSTListener(async ({ dfw }) => {
            const UserControl = new DFWUserController()
            return UserControl.crateDFWUserAsync({
                nick: 'zerozelta',
                password: 'test'
            }).catch(() => { throw "UNABLE_TO_CREATE" })
        }),
        secured: [
            GETListener(() => {

            })
        ]
    }
})

// Path protegido
DFW.addAccessValidator('/test/secured', ({ dfw }) => {
    return false
})
/*

DFW.addListener('/', async ({

}) => {

})

DFW.APIManager.addListener("/", async (req, res) => {
    return DFW.FileManager.removeFileAsync(1);
})

DFW.APIManager.addListener("/login", async (req, res, dfw) => {
    await dfw.SessionManager.loginAsync(req, "test", "test").catch(() => {
        throw 'ERROR'
    })
    return dfw.boot();
})

DFW.APIManager.addListener("/logout", async (req, res, dfw) => {
    await req.dfw.SessionManager.logoutAsync(req);
    return dfw.boot();
})

DFW.APIManager.addListener("/security", async (req, res, dfw) => {
    console.log("Esto no debería haber pasado de aqui")
    return dfw.boot();
}, {
    security: {
        session: true
    }
})

DFW.APIManager.addListener("/boot", async (req, res) => {
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    req.dfw.addCallback(async () => {
        await sleep(1000)
        console.log('callback called...')
    })

    return req.dfw.boot();
})

DFW.APIManager.addListener("/file", async (req, res) => {
    return req.dfw.FileManager.flushUpload(req, "file", { description: "File test" });
}, { method: "post", upload: true, security: { session: true } })

DFW.APIManager.addListener("/error", async (req, res, dfw) => {
    return await dfw.db.$transaction(async (db) => {
        let t1 = performance.now();
        await dfw.UserManager.use(db).createCredentiaASync("DUMMY-1")
        console.log(performance.now() - t1);
        throw new Error("ERROR");
        await dfw.UserManager.use(db).createCredentiaASync("DUMMY-2")
        await dfw.UserManager.use(db).createCredentiaASync("DUMMY-2")
    }).catch((e) => {
        throw e.message;
        console.log(Object.keys(e))
    })
});

DFW.APIManager.addListener("/strap", async ({ dfw }, res) => {
    let newUser = await dfw.UserManager.createUserAsync("test@gmail.com", "test", "test");
    //let newCredential = await dfw.SecurityManager.createCredentialAsync("TESTER");
    let user = await dfw.db.dfw_user.findUnique({ where: { id: newUser.id } });
    let credential = await dfw.UserManager.assignCredentialAsync(user!, ["ADMIN", "TESTER"]);
    return { credential }
});
*/