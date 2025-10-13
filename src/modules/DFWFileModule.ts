import type { UploadedFile } from "express-fileupload"
import type { DFW_FILE_STORAGE } from "@prisma/client";
import { promisify } from "util";
import { DateTime } from "luxon";
import path from "path";
import fs from "fs";
import { DFWModule } from "#lib/DFWModule";
import { DFWUtils } from "#lib/DFWUtils";
import { DFWCore } from "#lib/DFWCore";

export type DFWUploadedFile = UploadedFile

export type SavedFileParams = {
    name?: string
    variant?: string
    expire?: Date
    idParent?: string
    url?: string
    storage?: DFW_FILE_STORAGE
    idUser?: string
}

export class DFWFileModule extends DFWModule {

    createFileRecordAsync = async (file: UploadedFile, { name, idUser, url, storage, expire, idParent, variant }: SavedFileParams = {}, extraFields?: object) => {
        return this.db.dfw_file.create({
            data: {
                name: name ?? file.name,
                size: file.size,
                mimetype: file.mimetype,
                checksum: file.md5,
                url,
                idUser,
                storage,
                expire,
                idParent,
                variant,
                ...extraFields
            }
        })
    }

    saveFileLocalAsync = async (file: UploadedFile, params: SavedFileParams = {}) => {
        const filePath = DateTime.now().toFormat("yyyy/MM")
        const fileName = DFWUtils.uuid()
        const ext = path.extname(file.name)
        const localPath = `${DFWCore.DFW_UPLOAD_DIR}/${filePath}`
        const localFilePath = `${localPath}/${fileName}${ext ?? ''}`

        const moveAsync = promisify(file.mv)

        fs.mkdirSync(localPath, { recursive: true })

        await moveAsync(localFilePath)

        return this.createFileRecordAsync(file, params, { path: localFilePath })
    }

    generateTempFileName = (posfix?: string) => {
        return path.join(this.DFW.tmpDir, `${DFWUtils.uuid()}${posfix ?? ""}`);
    }
}