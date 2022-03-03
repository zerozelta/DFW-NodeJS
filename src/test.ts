import { Prisma, PrismaClient } from "@prisma/client";
import { DFWCore } from ".";

var DFW = DFWCore.createInstance({
    database: {
        username: "root",
        database: "dfw-test",
        password: "",
        dialect: "mysql",
        logging: console.log
    },
});

//DFW.DatabaseManager.database.sync(); 

DFW.APIManager.startServer(300);

DFW.APIManager.addListener("/", async (req, res) => {

    return { hola: "mundo" }
})

DFW.APIManager.addListener("/login", async (req, res, dfw) => {
    await dfw.SessionManager.loginAsync(req, "aldodelacomarca@gmail.com", "Aldo1234");
    return dfw.boot();
})

DFW.APIManager.addListener("/logout", async (req, res, dfw) => {
    await req.dfw.SessionManager.logoutAsync(req);
    return dfw.boot();
})

DFW.APIManager.addListener("/boot", async (req, res) => {
    return req.dfw.boot();
})

DFW.APIManager.addListener("/error", async (req, res) => {
    throw "ERROR_TEST_CODE";
    return { you: "shoulnt see this" };
});

DFW.APIManager.addListener("/strap", async ({ dfw }, res) => {

    //let newUser = await dfw.UserManager.createUserAsync("aldodelacomarca@gmail.com","zerozelta","Aldo1234");
    //let newCredential = await dfw.SecurityManager.createCredentialAsync("ADMIN");
    //await dfw.SecurityManager.createCredentialAsync("TESTER");

    let user = await dfw.db.dfw_user.findUnique({ where: { id: 1 } });
    let credential = await dfw.UserManager.addCredentialAsync(user!, ["ADMIN", "TESTER"]);

    return { credential }
});