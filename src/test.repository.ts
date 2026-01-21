import { DFW } from "./test.dfw"

export const TestRepository = DFW.makeModule({
    async getTestDataAsync() {
        return this.db.dfw_session.findMany()
    }
})