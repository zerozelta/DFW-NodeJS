import DFWController from "./DFWController";
import { promisify } from "util";
import * as fs from "fs";
import { UploadedFile } from "express-fileupload";
import { DFW_FILE_STORAGE } from "@prisma/client";
import { DateTime } from "luxon";
import path from "path";
import DFWUtils from "../DFWUtils";

type MakeRecordOptions = {
    url: string
    path: string
    name?: string
    storage?: DFW_FILE_STORAGE
    variant?: string
    expire?: Date
    idParent?: number
}

type SaveFileOptions = {
    name?: string
    variant?: string
    expire?: Date
    idParent?: number
}

class DFWFileController extends DFWController {
    async saveLocalFileAsync(file: UploadedFile, { name, expire, idParent, variant }: SaveFileOptions) {
        const filePath = DateTime.now().toFormat("yyyy/MM")
        const fileName = DFWUtils.uuid()
        const ext = path.extname(file.name)
        const localPath = `./.dfw/upload/public/${filePath}/${fileName}${ext}`
        const moveAsync = promisify(file.mv)

        fs.mkdirSync(`./.dfw/upload/public/${filePath}`, { recursive: true })

        await moveAsync(localPath)

        return this.makeFileRecordAsync(file, {
            name,
            url: `/static/files/${filePath}/${fileName}${ext}`,
            path: localPath,
            expire,
            idParent,
            variant,
            storage: DFW_FILE_STORAGE.LOCAL
        })
    }

    async makeFileRecordAsync(file: UploadedFile, {
        name,
        url,
        path,
        expire,
        idParent,
        storage = DFW_FILE_STORAGE.LOCAL
    }: MakeRecordOptions) {
        return this.db.dfw_file.create({
            data: {
                name: name ?? file.name,
                size: file.size,
                mimetype: file.mimetype,
                checksum: file.md5,
                url,
                path,
                storage,
                expire,
                idParent
            }
        }).catch((e) => { console.log(e) })
    }
}

export default DFWFileController