export type DFWBoot = {
    session: {
        user?: {
            id: number,
            nick?: string,
            email?: string,
            credentials: {
                id: number,
                name: string,
                access: {
                    id: number,
                    name: string,
                }[]
            }[],
        }
    }
}

export default DFWBoot;