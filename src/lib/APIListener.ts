import { RequestHandler } from "express";
import fileUpload from "express-fileupload";
import { DFWRequest, DFWRequestSchema, DFWResponse } from "../types";
import { DFWServiceConstructor } from "./DFWService";

export type APIMethod = 'get' | 'post' | 'put' | 'delete' | 'options' | 'patch' | 'use'
export type ListenerFn<TServices extends readonly DFWServiceConstructor[] = []> =
  (
    dfw: DFWRequestSchema<TServices>,
    req: DFWRequest<TServices>,
    res: DFWResponse
  ) => Promise<any | undefined> | any | undefined;

export type APIListener = {
  params?: APIListenerParams
  listener?: ListenerFn
}

export type APIListenerFunction = {
  (fn: ListenerFn): APIListener;
  (params: APIListenerParams, fn: ListenerFn): APIListener;
}

export type APIListenerParams = {
  /**
   * REST API Method
   */
  method?: APIMethod;

  /**
   * if true the listiner will be simple express function without any DFW native middleware
   */
  raw?: boolean

  /**
   * Express middleware (compatible with raw listeners)
   */
  middleware?: RequestHandler | RequestHandler[];

  /**
   *  
   */
  services?: DFWServiceConstructor[]

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

export type APIListenerParamsWithoutMethod = Omit<APIListenerParams, 'method'>;

export const makeAPIListenerFunction = (baseParams: Partial<APIListenerParams>) => {
  function listener<TServices extends readonly DFWServiceConstructor[]>(
    params: APIListenerParamsWithoutMethod & { services: TServices },
    fn: ListenerFn<TServices>
  ): APIListener;

  function listener(
    fn: ListenerFn
  ): APIListener;

  function listener(arg1: any, arg2?: any): APIListener {
    if (typeof arg1 === "function") {
      return {
        listener: arg1,
        params: {
          ...baseParams,
        },
      };
    } else {
      return {
        listener: arg2!,
        params: {
          ...arg1,
          ...baseParams,
        },
      };
    }
  }

  return listener;
};

