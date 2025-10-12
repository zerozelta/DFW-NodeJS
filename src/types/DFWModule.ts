type Constructor<T = any> = new (...args: any[]) => T;

export type ExtractRepositories<T extends Constructor[]> = {
    [K in T[number]as K extends { namespace: string }
    ? K['namespace']
    : never]: InstanceType<K>;
};
