import { DFWUserRepository } from "./repositories/DFWUserRepository";
import { DFW } from "./test.dfw";
import { TestRepository } from "./test.repository";

export const TestService = DFW.makeService({
    test: new TestRepository(),
    dfwUser: new DFWUserRepository(DFW),
}, {
    async getSessions() {
        return this.transaction(async (db) => {
            const { getTestDataAsync } = this.test.use(db)
            return getTestDataAsync()
        })
    }
})