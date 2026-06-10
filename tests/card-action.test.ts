import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";

// Mock channel
function createMockChannel() {
  return {
    send: mock.fn(async () => {}),
  };
}

// Mock event
function createMockEvent(actionValue: string | object, chatId = "oc_test", userId = "ou_test") {
  return {
    messageId: "om_test",
    chatId,
    operator: { openId: userId },
    action: { value: actionValue, tag: "button" },
  };
}

describe("handleCardAction", () => {
  it("处理 copy_title 按钮", async () => {
    const { handleCardAction } = await import("../src/handler/card-action");
    const channel = createMockChannel();
    const evt = createMockEvent({ action: "copy_title", text: "测试标题" });

    await handleCardAction(channel as any, evt as any);

    assert.equal(channel.send.mock.callCount(), 1);
    const args = channel.send.mock.calls[0].arguments;
    assert.ok(args[1].text.includes("测试标题"));
  });

  it("处理 copy_content 按钮", async () => {
    const { handleCardAction } = await import("../src/handler/card-action");
    const channel = createMockChannel();
    const evt = createMockEvent({ action: "copy_content", text: "测试正文" });

    await handleCardAction(channel as any, evt as any);

    assert.equal(channel.send.mock.callCount(), 1);
    const args = channel.send.mock.calls[0].arguments;
    assert.ok(args[1].text.includes("测试正文"));
  });

  it("处理 xhs_cancel 按钮", async () => {
    const { handleCardAction } = await import("../src/handler/card-action");
    const channel = createMockChannel();
    const evt = createMockEvent("xhs_cancel");

    await handleCardAction(channel as any, evt as any);

    assert.equal(channel.send.mock.callCount(), 1);
    const args = channel.send.mock.calls[0].arguments;
    assert.ok(args[1].text.includes("已取消"));
  });

  it("处理 regenerate 按钮", async () => {
    const { handleCardAction } = await import("../src/handler/card-action");
    const channel = createMockChannel();
    const evt = createMockEvent("regenerate");

    await handleCardAction(channel as any, evt as any);

    assert.equal(channel.send.mock.callCount(), 1);
    const args = channel.send.mock.calls[0].arguments;
    assert.ok(args[1].text.includes("重新生成"));
  });

  it("处理字符串类型的 action value", async () => {
    const { handleCardAction } = await import("../src/handler/card-action");
    const channel = createMockChannel();
    const evt = createMockEvent("xhs_cancel");

    await handleCardAction(channel as any, evt as any);

    assert.equal(channel.send.mock.callCount(), 1);
  });

  it("异常时发送错误消息", async () => {
    const { handleCardAction } = await import("../src/handler/card-action");
    const channel = createMockChannel();
    // 第一次 send 正常，但 import 会失败（模拟模块加载异常）
    // 用一个不存在的 action 触发 import
    const evt = createMockEvent("xhs_confirm");

    // mock import 失败 - 通过让 channel.send 在特定调用时抛异常
    let callCount = 0;
    channel.send = mock.fn(async () => {
      callCount++;
      if (callCount === 1) {
        throw new Error("模拟发送失败");
      }
    });

    await handleCardAction(channel as any, evt as any);

    // catch 里会再次调用 send 发送错误消息
    assert.equal(channel.send.mock.callCount(), 2);
    const args = channel.send.mock.calls[1].arguments;
    assert.ok(args[1].text.includes("❌"));
  });
});
