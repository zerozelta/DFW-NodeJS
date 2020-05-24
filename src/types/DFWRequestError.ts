export class DFWRequestError extends Error {

    public static readonly CODE_API_LEVEL_ERROR = 0;
    public static readonly CODE_API_ACCESS_ERROR = 1;

    public code:number;
    public message:string;
    public ref?:any;

    constructor(code:number, message:string = "error", ref?:any){
        super();
        this.code = code;
        this.message = message;
        this.ref = ref;
    }
}