import type { NextFunction } from "express";
import type { DFWRequestSchema, DFWRequest, DFWResponse } from "#types/DFWRequest";
import type fileUpload from "express-fileupload";

export type DFWRegisterItem = APIListener<any> | { [key: string]: DFWRegisterItem } | DFWRegisterItem[]

export type APIMethod = 'get' | 'post' | 'put' | 'delete' | 'options' | 'patch' | 'use'

export type ListenerFn<TPrisma = any> =
  (
    dfw: DFWRequestSchema<TPrisma>,
    req: DFWRequest<TPrisma>,
    res: DFWResponse
  ) => Promise<any | void> | any | void;

  export type DFWExpressHandler<TDatabase> =
  (req: DFWRequest<TDatabase>, res: DFWResponse, next: NextFunction) => any;

export type APIListener<TDatabase = any> = {

  /**
   * REST API Method
   */
  method?: APIMethod;

  /**
   * Main function to be called
   */
  fn?: ListenerFn<TDatabase>

  /**
   * Express middleware (compatible with raw listeners)
   */
  middleware?: DFWExpressHandler<TDatabase> | DFWExpressHandler<TDatabase>[];

  /**
   * File Upload middleware enabled receive a fileUpload.Options
   */
  upload?: fileUpload.Options | boolean

  /**
   * Disable the autosend system, you must specify what send to the clien and when
   */
  disableAutoSend?: boolean;

  /**
   * Disable body parser (body parser is installed only on post methods)
   */
  disableBodyParser?: boolean;

  /**
   * Callback function after the server responses to the client (after the connection was closed)
   * @param req 
   * @param listenerRes 
   * @returns 
   */
  callback?: (req: DFWRequest, listenerRes: any) => Promise<void>
}

export type APIListenerWithoutFn = Omit<APIListener, 'listener'>;
export type APIListenerWithoutMethod = Omit<APIListener, 'method'>;

export type APIListenerFunction = {
  (fn: ListenerFn): APIListener;
  (params: APIListenerWithoutFn, fn: ListenerFn): APIListener;
}