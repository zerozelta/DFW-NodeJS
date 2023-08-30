import { DFWCore } from ".";

var DFW = DFWCore.createInstance({
    session: {
        cookieOptions: {
            sameSite: "lax",
            secure: false,
            httpOnly: true,
            domain: "localhost",
            maxAge: 60 * 1000 * 60 * 24 * 365 // 365 days
        }
    }
});

//DFW.DatabaseManager.database.sync(); 

DFW.APIManager.startServer(300);

DFW.APIManager.addListener("/", async (req, res) => {
    return DFW.FileManager.removeFileAsync(1);
})

DFW.APIManager.addListener("/login", async (req, res, dfw) => {
    await dfw.SessionManager.loginAsync(req, "aldodelacomarca@gmail.com", "Aldo1234");
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
    let newUser = await dfw.UserManager.createUserAsync("test3@gmail.com", "test3", "test");
    //let newCredential = await dfw.SecurityManager.createCredentialAsync("TESTER");
    let user = await dfw.db.dfw_user.findUnique({ where: { id: newUser.id } });
    let credential = await dfw.UserManager.assignCredentialAsync(user!, ["ADMIN","TESTER"]);
    return { credential }
});