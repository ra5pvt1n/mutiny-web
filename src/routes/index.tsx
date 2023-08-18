import { Switch, Match } from "solid-js";
import { useMegaStore } from "~/state/megaStore";
import { App, FullscreenLoader, SetupErrorDisplay } from "~/components";

export default function Home() {
    const [state, _] = useMegaStore();

    return (
        <Switch fallback={<FullscreenLoader />}>
            <Match when={state.setup_error}>
                <SetupErrorDisplay initialError={state.setup_error!} />
            </Match>
            <Match when={true}>
                <App />
            </Match>
        </Switch>
    );
}
