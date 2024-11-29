import DFWController from "./DFWController";
import { promisify } from "util";
import { UploadedFile } from "express-fileupload";
import { DFW_FILE_STORAGE } from "@prisma/client";
import { DateTime } from "luxon";
import path from "path";
import DFWUtils from "../DFWUtils";
import fs from "fs";
import { DFWCore } from "..";

type SaveFileOptions = {
    name?: string
    variant?: string
    expire?: Date
    idParent?: string
    makeUrl: (filePath: string) => string
}

class DFWFileController extends DFWController {

    async saveUploadedFileAsync(file: UploadedFile, { name, expire, idParent, variant, makeUrl }: SaveFileOptions) {
        const filePath = DateTime.now().toFormat("yyyy/MM")
        const fileName = DFWUtils.uuid()
        const ext = path.extname(file.name)
        const localPath = `${DFWCore.DFW_UPLOAD_DIR}/${filePath}`
        const localFilePath = `${localPath}/${fileName}${ext ?? ''}`
        const moveAsync = promisify(file.mv)

        fs.mkdirSync(localPath, { recursive: true })

        await moveAsync(localFilePath)

        return this.db.dfw_file.create({
            data: {
                name: name ?? file.name,
                size: file.size,
                mimetype: file.mimetype,
                checksum: file.md5,
                url: makeUrl(`${filePath}/${fileName}${ext ?? ''}`),
                path: localFilePath,
                storage: DFW_FILE_STORAGE.LOCAL,
                expire,
                idParent,
                variant
            }
        })
    }

    public generateTempFileName(posfix?: string) {
        return path.join(this.DFW.tmpDir, `${DFWUtils.uuid()}${posfix ?? ""}`);
    }
}

export default DFWFileController