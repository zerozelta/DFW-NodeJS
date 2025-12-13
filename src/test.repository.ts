import { DFW } from "./test.dfw"

export const TestRepository = DFW.makeRepository({
    async getTestDataAsync() {
        return this.db.dfw_session.findMany()
    }
})