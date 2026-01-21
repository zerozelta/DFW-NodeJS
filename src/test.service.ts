import { DFW } from "./test.dfw";
import { TestRepository } from "./test.repository";

export const TestService = DFW.makeModule({
    async getSessions() {
        return this.transaction(async (db) => {
            const { getTestDataAsync } = new TestRepository().use(db)
            return getTestDataAsync()
        })
    }
})

export const TestBService = DFW.makeModule({
    async testB() {
        return this.transaction(async (db) => {
            const { getSessions } = new TestService().use(db)
            return getSessions()
        })
    }
})