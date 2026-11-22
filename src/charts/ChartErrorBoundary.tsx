import {Component,type ErrorInfo,type ReactNode} from "react";
import {AlertTriangle,RefreshCcw} from "lucide-react";

type Props={
  title:string;
  resetKey:string;
  children:ReactNode;
};
type State={
  error:Error|null;
  revision:number;
};
/** Constrains failures to the affected chart pane. A broken indicator or
 * chart component must not wipe unrelated drawings, alerts or other panes.
 *
 * React error boundaries handle render/lifecycle exceptions; non-React
 * asynchronous network errors belong to each provider hook's status channel.
 */
export class ChartErrorBoundary extends Component<Props,State>{
  state:State={error:null,revision:0};
  static getDerivedStateFromError(error:Error):Pick<State,"error">{
    return {error};
  }
  componentDidCatch(error:Error,info:ErrorInfo){
    // Error details stay inside the developer console, not persisted in
    // workspaces or transmitted to a telemetry service.
    console.error("Chart rendering fault:",error,info.componentStack);
  }
  componentDidUpdate(previous:Props){
    if(previous.resetKey!==this.props.resetKey&&this.state.error){
      this.setState(state=>({error:null,revision:state.revision+1}));
    }
  }
  private retry=()=>this.setState(state=>({error:null,revision:state.revision+1}));
  render(){
    if(this.state.error){
      return <section className="chart-failure" role="alert">
        <div className="chart-failure-icon"><AlertTriangle size={24}/></div>
        <div className="chart-failure-content">
          <strong>{this.props.title} could not render</strong>
          <p>The chart encountered an unexpected rendering error.
            Your saved drawings, alerts and workspace settings have not been cleared.
            Retry the chart, or change the instrument or timeframe.</p>
          <button aria-label={"Retry "+this.props.title}
            onClick={this.retry}><RefreshCcw size={15}/> Retry chart</button>
        </div>
      </section>;
    }
    return <div className="chart-failure-scope" key={this.state.revision}>
      {this.props.children}
    </div>;
  }
}
