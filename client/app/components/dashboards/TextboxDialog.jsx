import { toString } from "lodash";
import { markdown } from "markdown";
import React, { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { useDebouncedCallback } from "use-debounce";
import Modal from "antd/lib/modal";
import Input from "antd/lib/input";
import Tooltip from "@/components/Tooltip";
import Divider from "antd/lib/divider";
import Link from "@/components/Link";
import HtmlContent from "@redash/viz/lib/components/HtmlContent";
import { wrap as wrapDialog, DialogPropType } from "@/components/DialogWrapper";
import notification from "@/services/notification";

import "./TextboxDialog.less";

function TextboxDialog({ dialog, isNew, ...props }) {
  const [text, setText] = useState(toString(props.text));
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    setText(props.text);
    setPreview(markdown.toHTML(props.text));
  }, [props.text]);

  const [updatePreview] = useDebouncedCallback(() => {
    setPreview(markdown.toHTML(text));
  }, 200);

  const handleInputChange = useCallback(
    event => {
      setText(event.target.value);
      updatePreview();
    },
    [updatePreview]
  );

  const saveWidget = useCallback(() => {
    dialog.close(text).catch(() => {
      notification.error(isNew ? "無法增加物件" : "無法保存物件");
    });
  }, [dialog, isNew, text]);

  const confirmDialogDismiss = useCallback(() => {
    const originalText = props.text;
    if (text !== originalText) {
      Modal.confirm({
        title: "退出編輯?",
        content: "您到目前為止所做的更改將不會被保存，你確定嗎?",
        okText: "是，離開",
        okType: "danger",
        onOk: () => dialog.dismiss(),
        maskClosable: true,
        autoFocusButton: null,
        style: { top: 170 },
      });
    } else {
      dialog.dismiss();
    }
  }, [dialog, text, props.text]);

  return (
    <Modal
      {...dialog.props}
      title={isNew ? "增加文字檔" : "編輯文字檔"}
      onOk={saveWidget}
      onCancel={confirmDialogDismiss}
      okText={isNew ? "增加到儀表板" : "儲存"}
      width={500}
      wrapProps={{ "data-test": "TextboxDialog" }}>
      <div className="textbox-dialog">
        <Input.TextArea
          className="resize-vertical"
          rows="5"
          value={text}
          aria-label="Textbox widget content"
          onChange={handleInputChange}
          autoFocus
          placeholder="寫上你想要的文字"
        />
        <small>
          基本支援{" "}
          <Link
            target="_blank"
            rel="noopener noreferrer"
            href="https://www.markdownguide.org/cheat-sheet/#basic-syntax">
            <Tooltip title="Markdown guide opens in new window">Markdown</Tooltip>
          </Link>
          .
        </small>
        {text && (
          <React.Fragment>
            <Divider dashed />
            <strong className="preview-title">預覽:</strong>
            <HtmlContent className="preview markdown">{preview}</HtmlContent>
          </React.Fragment>
        )}
      </div>
    </Modal>
  );
}

TextboxDialog.propTypes = {
  dialog: DialogPropType.isRequired,
  isNew: PropTypes.bool,
  text: PropTypes.string,
};

TextboxDialog.defaultProps = {
  isNew: false,
  text: "",
};

export default wrapDialog(TextboxDialog);
