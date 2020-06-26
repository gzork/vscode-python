import { inject, injectable } from 'inversify';
// tslint:disable-next-line: no-require-imports
import cloneDeep = require('lodash/cloneDeep');
import { extensions } from 'vscode';
import { concatMultilineStringInput } from '../../../datascience-ui/common';
import { IConfigurationService } from '../../common/types';
import { noop } from '../../common/utils/misc';
import { CellMatcher } from '../cellMatcher';
import { GatherExtension } from '../constants';
import { ICell as IVscCell, IGatherLogger } from '../types';

@injectable()
// tslint:disable: no-any
export class GatherLogger implements IGatherLogger {
    private gather: any | undefined;
    constructor(@inject(IConfigurationService) private configService: IConfigurationService) {
        this.initGatherExtension().ignoreErrors();
    }

    public dispose() {
        noop();
    }
    public onKernelRestarted() {
        noop();
    }

    public async preExecute(_vscCell: IVscCell, _silent: boolean): Promise<void> {
        // This function is just implemented here for compliance with the INotebookExecutionLogger interface
        noop();
    }

    public async postExecute(vscCell: IVscCell, _silent: boolean): Promise<void> {
        if (this.gather) {
            // Don't log if vscCell.data.source is an empty string or if it was
            // silently executed. Original Jupyter extension also does this.
            if (vscCell.data.source !== '' && !_silent) {
                // First make a copy of this cell, as we are going to modify it
                const cloneCell: IVscCell = cloneDeep(vscCell);

                // Strip first line marker. We can't do this at JupyterServer.executeCodeObservable because it messes up hashing
                const cellMatcher = new CellMatcher(this.configService.getSettings().datascience);
                cloneCell.data.source = cellMatcher.stripFirstMarker(concatMultilineStringInput(vscCell.data.source));

                this.gather.logExecution(cloneCell);
            }
        }
    }

    public getGatherProvider(): any | undefined {
        return this.gather;
    }

    private async initGatherExtension() {
        const ext = extensions.getExtension(GatherExtension);
        if (ext) {
            if (!ext.isActive) {
                await ext.activate();
            }
            const api = ext.exports;

            this.gather = api.getGatherProvider();
        }
    }
}
