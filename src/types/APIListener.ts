import type { Handler } from "express";
import type { ZodSchema } from "zod";
import type { DFWServiceConstructor } from "#types/DFWService"
import type { DFWRequestSchema, DFWRequest, DFWResponse } from "#types/DFWRequest";
import type fileUpload from "express-fileupload";

export type DFWRegisterItem = APIListener | { [key: string]: DFWRegisterItem } | DFWRegisterItem[]

export type APIMethod = 'get' | 'post' | 'put' | 'delete' | 'options' | 'patch' | 'use'

export type ListenerFn<TServices extends readonly DFWServiceConstructor[] = []> =
  (
    dfw: DFWRequestSchema<TServices>,
    req: DFWRequest<TServices>,
    res: DFWResponse
  ) => Promise<any | void> | any | void;

export type APIListener = {

  /**
   * REST API Method
   */
  method?: APIMethod;

  /**
   * Main function to be called
   */
  fn?: ListenerFn

  /**
   * Express middleware (compatible with raw listeners)
   */
  middleware?: Handler | Handler[];

  /**
   * zod validations
   */
  validate?: {
    /**
     * Validate the request body
     */
    body?: ZodSchema;

    /**
     * Validate the request query
     */
    query?: ZodSchema;
  }

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

export type APIListenerWithoutFn = Omit<APIListener, 'listener'>;
export type APIListenerWithoutMethod = Omit<APIListener, 'method'>;

export type APIListenerFunction = {
  (fn: ListenerFn): APIListener;
  (params: APIListenerWithoutFn, fn: ListenerFn): APIListener;
}