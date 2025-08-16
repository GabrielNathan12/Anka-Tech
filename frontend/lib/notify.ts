import {  toast } from 'react-toastify';

export function notifyError (msg: string) {
    toast.error(msg, {
        position: 'bottom-right',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true
    })
}

export function notifySuccess(msg: string) { 
    toast.success(msg, {
        position: 'bottom-right',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        
    })}