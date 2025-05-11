import AlertPortal, {type AlertProps} from "./alert";
import NoticePortal, {type NoticeProps} from "./notice";
import {eventEmit} from "@/lib/events.ts";

export function Alert(props: AlertProps) {
  eventEmit("alert", props)
}

export function Notice(props: NoticeProps) {
  eventEmit("notice", props)
}

export default function CommonPortal() {
  return (
    <>
      <AlertPortal/>
      <NoticePortal/>
    </>
  )
}
