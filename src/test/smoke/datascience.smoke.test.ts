// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

// tslint:disable:max-func-body-length no-invalid-this no-any

import * as fs from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';
import { getOSType, openFile, OSType, waitForCondition } from '../common';
import { EXTENSION_ROOT_DIR_FOR_TESTS, IS_SMOKE_TEST } from '../constants';
import { noop, sleep } from '../core';
import { closeActiveWindows, initialize, initializeTest } from '../initialize';

const timeoutForCellToRun = 3 * 60 * 1_000;

suite('Smoke Test: Interactive Window', () => {
    suiteSetup(async function() {
        if (!IS_SMOKE_TEST) {
            return this.skip();
        }
        // Skip for now on windows.
        if (getOSType() === OSType.Windows){
            return this.skip();
        }
        await initialize();
    });
    setup(initializeTest);
    suiteTeardown(closeActiveWindows);
    teardown(closeActiveWindows);

    test('Run Cell in interactive window', async () => {
        const file = path.join(EXTENSION_ROOT_DIR_FOR_TESTS, 'src', 'test', 'pythonFiles', 'datascience', 'simple_note_book.py');
        const outputFile = path.join(path.dirname(file), 'ds.log');
        if (await fs.pathExists(outputFile)) {
            await fs.unlink(outputFile);
        }
        const textDocument = await openFile(file);

        // Wait for code lenses to get detected.
        await sleep(1_000);

        await vscode.commands.executeCommand<void>('python.datascience.runallcells', textDocument.uri);
        const checkIfFileHasBeenCreated = () => fs.pathExists(outputFile);
        await waitForCondition(checkIfFileHasBeenCreated, timeoutForCellToRun, `"${outputFile}" file not created`);
    }).timeout(timeoutForCellToRun);

    test('Run Cell in native editor', async () => {
        const file = path.join(EXTENSION_ROOT_DIR_FOR_TESTS, 'src', 'test', 'pythonFiles', 'datascience', 'simple_nb.ipynb');
        const fileContents = await fs.readFile(file, { encoding: 'utf-8' });
        const outputFile = path.join(path.dirname(file), 'ds.log');
        await fs.writeFile(file, fileContents.replace('\'ds.log\'', `'${outputFile}'`), { encoding: 'utf-8' });
        if (await fs.pathExists(outputFile)) {
            await fs.unlink(outputFile);
        }
        // Ignore exceptions (as native editor closes the document as soon as its opened);
        await openFile(file).catch(noop);

        // Wait for 15 seconds for notebook to launch.
        // Unfortunately there's no way to know for sure it has completely loaded.
        await sleep(15_000);

        await vscode.commands.executeCommand<void>('python.datascience.notebookeditor.runallcells');
        const checkIfFileHasBeenCreated = () => fs.pathExists(outputFile);
        await waitForCondition(checkIfFileHasBeenCreated, timeoutForCellToRun, `"${outputFile}" file not created`);
    }).timeout(timeoutForCellToRun);
});