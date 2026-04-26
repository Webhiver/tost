import {useEffect, useCallback, useState, useRef, ChangeEvent, MouseEvent, Fragment} from "react";
import WrapperPanel from "./WrapperPanel";
import {useContextSelector} from "@fluentui/react-context-selector";
import {LocalContext} from "../../_context";
import { PiUploadBold } from "react-icons/pi";
import { BsPatchCheckFill } from "react-icons/bs";
import {useIntl} from "react-intl";

type UpdateStatus = 'idle' | 'uploading' | 'success' | 'error'

const FirmwareCard = ({version, description}: {version: string, description: string}) => {
    const intl = useIntl();

    return (
        <div className="flex flex-col items-stretch justify-start gap-2 border border-slate-300 dark:border-slate-600 bg-white/30 dark:bg-black/30 rounded-lg p-4">
            <div className="flex-1 flex justify-between items-center">
                <h1 className="text-lg text-slate-500">Firmware {version}</h1>
                <button className="bg-sky-500 text-white px-3 py-1 rounded-full cursor-pointer hover:bg-sky-600 transition-colors">{intl.formatMessage({id: "updates.installFirmware"})}</button>
            </div>
            <div className="text-sm text-slate-400">{description}</div>
        </div>
    );
}

const UpdatesPanel = () => {

    const currentFirmwareVersion = useContextSelector(LocalContext, c => c.firmwareVersion);
    const previousFirmwareVersion = useRef(currentFirmwareVersion);

    const [status, setStatus] = useState<UpdateStatus>('idle');
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const intl = useIntl();

    const handleFileSelect = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            // Validate file type
            if (!file.name.endsWith('.tar.gz') && !file.name.endsWith('.tgz')) {
                setError('Please select a .tar.gz file');
                setSelectedFile(null);
                return;
            }
            setSelectedFile(file);
            setError(null);
        }
    }, []);

    const handleUpload = useCallback(async () => {
        if (!selectedFile) return

        setStatus('uploading')
        setProgress(0)
        setError(null)

        try {
            const xhr = new XMLHttpRequest()

            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percent = Math.round((e.loaded / e.total) * 100)
                    setProgress(percent)
                }
            })

            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    setStatus('success')
                    setSelectedFile(null)
                    if (fileInputRef.current) {
                        fileInputRef.current.value = ''
                    }
                } else {
                    let errorMsg = 'Upload failed'
                    try {
                        const response = JSON.parse(xhr.responseText)
                        errorMsg = response.error || errorMsg
                    } catch {
                        // Use default error message
                    }
                    setStatus('error')
                    setError(errorMsg)
                }
            })

            xhr.addEventListener('error', () => {
                setStatus('error')
                setError('Network error occurred')
            })

            xhr.addEventListener('timeout', () => {
                setStatus('error')
                setError('Upload timed out')
            })

            xhr.open('POST', '/api/update')
            xhr.timeout = 120000 // 2 minute timeout for upload
            xhr.setRequestHeader('Content-Type', 'application/gzip')
            xhr.send(selectedFile) // Send raw file bytes

        } catch (err) {
            setStatus('error')
            setError(err instanceof Error ? err.message : 'Upload failed')
        }
    }, [selectedFile]);

    const handleCancel = useCallback((event?: MouseEvent<HTMLButtonElement>) => {
        if(event){
            event.preventDefault();
        }

        setSelectedFile(null);
        setError(null);
        setStatus('idle');
        setProgress(0);
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }, []);

    const formatFileSize = useCallback((bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }, []);

    useEffect(() => {
        if(currentFirmwareVersion !== previousFirmwareVersion.current) {
            handleCancel();
            previousFirmwareVersion.current = currentFirmwareVersion;
        }
    }, [currentFirmwareVersion]);

    return (
        <WrapperPanel type="updates">
            <div className="py-4 flex flex-col justify-start items-stretch gap-4">
                <div className="bg-amber-400/50 dark:bg-amber-400/60 border border-amber-400 text-amber-700 dark:text-amber-900 p-3 rounded-lg">{intl.formatMessage({id: "updates.warning"})}</div>
                <div className="font-light text-slate-400">{intl.formatMessage({id: "updates.section.installed"})}</div>
                <div className="flex flex-col items-stretch justify-start gap-2 border border-slate-300 dark:border-slate-600 bg-white/30 dark:bg-black/30 rounded-lg p-4">
                    <div className="text-slate-400">{intl.formatMessage({id: "updates.currentFirmware"}, {version: currentFirmwareVersion})}</div>
                </div>

                <div className="font-light text-slate-400">{intl.formatMessage({id: "updates.section.available"})}</div>
                <FirmwareCard version="v1.0.22" description="Release notes for v1.0.22" />

                <div className="font-light text-slate-400">{intl.formatMessage({id: "updates.section.manual"})}</div>
                <div className="h-40 relative border border-dashed border-slate-400 p-4 flex flex-col justify-center items-center gap-2 rounded-lg overflow-hidden cursor-pointer hover:border-slate-600 transition-colors">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".tar.gz,.tgz"
                        onChange={handleFileSelect}
                        disabled={status === 'uploading' || selectedFile !== null}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        id="firmware-file"
                        title=""
                    />
                    <div className="absolute inset-0 bg-green-500/20 pointer-events-none" style={{width: `${progress}%`}}/>
                    {!selectedFile && status !== 'success' && (
                        <Fragment>
                            <PiUploadBold className="size-6 text-slate-500"/>
                            <span className="text-sm text-slate-600">{intl.formatMessage({id: "updates.clickToSelect"})}</span>
                            <span className="text-xs text-slate-500">{intl.formatMessage({id: "updates.format"})}</span>
                        </Fragment>
                    )}
                    {selectedFile && status !== 'success' && (
                        <Fragment>
                            <PiUploadBold className="size-6 text-slate-500"/>
                            <span className="text-sm text-slate-600">{selectedFile.name}</span>
                            <span className="text-xs text-slate-500">{formatFileSize(selectedFile.size)}</span>
                            <div className="flex justify-center items-center gap-2">
                                <button onClick={handleUpload} disabled={status === 'uploading'} className="relative bg-green-500 text-white px-3 py-1 rounded-full cursor-pointer hover:bg-green-600 transition-colors disabled:opacity-30">{status === 'uploading' ? intl.formatMessage({id: "updates.uploadingFile"}) : intl.formatMessage({id: "updates.installFile"})}</button>
                                <button onClick={handleCancel} disabled={status === 'uploading'} className="relative bg-red-500 text-white px-3 py-1 rounded-full cursor-pointer hover:bg-red-600 transition-colors disabled:opacity-30">{intl.formatMessage({id: "updates.removeFile"})}</button>
                            </div>
                        </Fragment>
                    )}
                    {status === 'success' && (
                        <Fragment>
                            <BsPatchCheckFill className="size-6 text-green-500"/>
                            <span className="text-base text-slate-600">{intl.formatMessage({id: "updates.updateSucessfull"})}</span>
                            <span className="text-sm text-slate-500">{intl.formatMessage({id: "updates.restartingSoon"})}</span>
                        </Fragment>
                    )}
                </div>
                {error && (
                    <div className="flex justify-center items-start gap-2 text-red-500 text-sm">
                        {error}
                    </div>
                )}
            </div>
        </WrapperPanel>
    );
}

export default UpdatesPanel;
