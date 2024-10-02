import fileUpload from "express-fileupload";
import { APIListener, APIListenerFunction } from "../types/APIListener";

const UploadListener: (fn: APIListenerFunction, options?: fileUpload.Options) => APIListener = (fn, options) => {
    return {
        listener: fn,
        params: {
            middleware: [fileUpload(options)],
            method: 'post'
        }
    }
}

export default UploadListener