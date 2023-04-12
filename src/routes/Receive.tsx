import { TextField } from "@kobalte/core";
import { createMemo, createResource, createSignal, Match, Show, Suspense, Switch } from "solid-js";
import { QRCodeSVG } from "solid-qr-code";
import { AmountInput } from "~/components/AmountInput";
import { Button, Card, SafeArea, SmallHeader } from "~/components/layout";
import NavBar from "~/components/NavBar";
import { useMegaStore } from "~/state/megaStore";
import { satsToUsd } from "~/utils/conversions";
import { objectToSearchParams } from "~/utils/objectToSearchParams";
import { useCopy } from "~/utils/useCopy";

function ShareButton(props: { receiveString: string }) {
    async function share(receiveString: string) {
        // If the browser doesn't support share we can just copy the address
        if (!navigator.share) {
            console.error("Share not supported")
        }
        const shareData: ShareData = {
            title: "Mutiny Wallet",
            text: receiveString,
        }
        try {
            await navigator.share(shareData)
        } catch (e) {
            console.error(e)
        }
    }

    return (
        <Button onClick={(_) => share(props.receiveString)}>Share</Button>
    )
}

type ReceiveState = "edit" | "show"

export default function Receive() {
    const [state, _] = useMegaStore()

    const [amount, setAmount] = createSignal("")
    const [label, setLabel] = createSignal("")

    const [receiveState, setReceiveState] = createSignal<ReceiveState>("edit")

    let amountInput!: HTMLInputElement;
    let labelInput!: HTMLInputElement;

    function editAmount(e: Event) {
        e.preventDefault();
        setReceiveState("edit")
        amountInput.focus();
    }

    function editLabel(e: Event) {
        e.preventDefault();
        setReceiveState("edit")
        labelInput.focus();
    }

    const [unified, setUnified] = createSignal("")

    const [copy, copied] = useCopy({ copiedTimeout: 1000 });

    async function getUnifiedQr(amount: string, label: string) {
        const bigAmount = BigInt(amount);
        const bip21Raw = await state.node_manager?.create_bip21(bigAmount, label);

        const params = objectToSearchParams({
            amount: bip21Raw?.btc_amount,
            label: bip21Raw?.description,
            lightning: bip21Raw?.invoice
        })

        return `bitcoin:${bip21Raw?.address}?${params}`
    }

    async function onSubmit(e: Event) {
        e.preventDefault();

        const unifiedQr = await getUnifiedQr(amount(), label())

        setUnified(unifiedQr)
        setReceiveState("show")
    }

    async function getPrice() {
        return await state.node_manager?.get_bitcoin_price()
    }

    const [price] = createResource(getPrice)

    const amountInUsd = createMemo(() => satsToUsd(price(), parseInt(amount()) || 0, true))

    return (
        <SafeArea main>
            <div class="w-full max-w-[400px] flex flex-col gap-4">
                <Suspense fallback={"..."}>
                    {/* If I don't have this guard then the node manager only half-works */}
                    <Show when={state.node_manager}>
                        <Switch>
                            <Match when={!unified() || receiveState() === "edit"}>
                                <form class="border border-white/20 rounded-xl p-2 flex flex-col gap-4" onSubmit={onSubmit} >
                                    {/* TODO this initial amount is not reactive, hope that's okay? */}
                                    <AmountInput initialAmountSats={amount()} setAmountSats={setAmount} refSetter={el => amountInput = el} />
                                    <TextField.Root
                                        value={label()}
                                        onValueChange={setLabel}
                                        class="flex flex-col gap-2"
                                    >
                                        <TextField.Label class="text-sm font-semibold uppercase" >Label (private)</TextField.Label>
                                        <TextField.Input
                                            autofocus
                                            ref={el => labelInput = el}
                                            class="w-full p-2 rounded-lg text-black" />
                                    </TextField.Root>
                                    <Button disabled={!amount() || !label()} layout="small" type="submit">Create Invoice</Button>
                                </form >
                            </Match>
                            <Match when={unified() && receiveState() === "show"}>
                                <div class="w-full bg-white rounded-xl">
                                    <QRCodeSVG value={unified() ?? ""} class="w-full h-full p-8 max-h-[400px]" />
                                </div>
                                <div class="flex gap-2 w-full">
                                    <Button onClick={(_) => copy(unified() ?? "")}>{copied() ? "Copied" : "Copy"}</Button>
                                    <ShareButton receiveString={unified() ?? ""} />
                                </div>
                                <Card>
                                    <SmallHeader>Amount</SmallHeader>
                                    <div class="flex justify-between">
                                        <p>{amount()} sats</p><button onClick={editAmount}>&#x270F;&#xFE0F;</button>
                                    </div>
                                    <pre>({amountInUsd()})</pre>
                                    <SmallHeader>Private Label</SmallHeader>
                                    <div class="flex justify-between">
                                        <p>{label()} </p><button onClick={editLabel}>&#x270F;&#xFE0F;</button>
                                    </div>
                                </Card>
                                <Card title="Bip21">
                                    <code class="break-all">{unified()}</code>
                                </Card>
                            </Match>
                        </Switch>
                    </Show>
                </Suspense>
            </div>
            <NavBar activeTab="none" />
        </SafeArea >

    )
}