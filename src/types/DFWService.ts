import type { DFWService } from "#lib/DFWService";

export type DFWServiceConstructor = new (dfw: any) => DFWService;

export type InferServiceInstance<T extends DFWServiceConstructor> =
    T extends new () => infer R ? R : never;

export type MapServiceConstructors<T extends readonly DFWServiceConstructor[]> = {
    [K in keyof T as T[K] extends DFWServiceConstructor
    ? InstanceType<T[K]>['namespace']
    : never]: T[K] extends DFWServiceConstructor
    ? InstanceType<T[K]>
    : never;
};
