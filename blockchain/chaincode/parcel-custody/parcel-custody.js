const { Contract } = require('fabric-contract-api');

class ParcelCustodyContract extends Contract {

    // Initialize the ledger with sample data
    async initLedger(ctx) {
        console.info('============= START : Initialize Ledger ===========');
        console.info('============= END : Initialize Ledger ===========');
    }

    // Create a new parcel record
    async createParcel(ctx, parcelId, trackingNumber, carrierName, originHash, destinationHash) {
        console.info('============= START : Create Parcel ===========');

        const parcel = {
            docType: 'parcel',
            parcelId,
            trackingNumber,
            carrierName,
            originHash,
            destinationHash,
            status: 'CREATED',
            events: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Add creation event
        const creationEvent = {
            eventType: 'PARCEL_CREATED',
            timestamp: new Date().toISOString(),
            actor: carrierName,
            details: {
                originHash,
                destinationHash
            }
        };

        parcel.events.push(creationEvent);

        await ctx.stub.putState(parcelId, Buffer.from(JSON.stringify(parcel)));
        console.info('============= END : Create Parcel ===========');
        
        return JSON.stringify(parcel);
    }

    // Record parcel dispatch
    async dispatchParcel(ctx, parcelId, vehicleId, driverName, estimatedDeliveryTime) {
        console.info('============= START : Dispatch Parcel ===========');

        const parcelAsBytes = await ctx.stub.getState(parcelId);
        if (!parcelAsBytes || parcelAsBytes.length === 0) {
            throw new Error(`Parcel ${parcelId} does not exist`);
        }

        const parcel = JSON.parse(parcelAsBytes.toString());
        
        if (parcel.status !== 'CREATED') {
            throw new Error(`Parcel ${parcelId} cannot be dispatched. Current status: ${parcel.status}`);
        }

        // Update parcel status
        parcel.status = 'DISPATCHED';
        parcel.currentVehicleId = vehicleId;
        parcel.currentDriver = driverName;
        parcel.updatedAt = new Date().toISOString();

        // Add dispatch event
        const dispatchEvent = {
            eventType: 'PARCEL_DISPATCHED',
            timestamp: new Date().toISOString(),
            actor: driverName,
            details: {
                vehicleId,
                estimatedDeliveryTime
            }
        };

        parcel.events.push(dispatchEvent);

        await ctx.stub.putState(parcelId, Buffer.from(JSON.stringify(parcel)));
        console.info('============= END : Dispatch Parcel ===========');
        
        return JSON.stringify(parcel);
    }

    // Record custody transfer (consolidation)
    async transferCustody(ctx, parcelId, newVehicleId, newDriverName, reason, approvedBy) {
        console.info('============= START : Transfer Custody ===========');

        const parcelAsBytes = await ctx.stub.getState(parcelId);
        if (!parcelAsBytes || parcelAsBytes.length === 0) {
            throw new Error(`Parcel ${parcelId} does not exist`);
        }

        const parcel = JSON.parse(parcelAsBytes.toString());
        
        if (parcel.status !== 'DISPATCHED' && parcel.status !== 'IN_TRANSIT') {
            throw new Error(`Parcel ${parcelId} cannot be transferred. Current status: ${parcel.status}`);
        }

        // Store previous custody info
        const previousVehicleId = parcel.currentVehicleId;
        const previousDriver = parcel.currentDriver;

        // Update custody
        parcel.currentVehicleId = newVehicleId;
        parcel.currentDriver = newDriverName;
        parcel.isConsolidated = true;
        parcel.updatedAt = new Date().toISOString();

        // Add custody transfer event
        const transferEvent = {
            eventType: 'CUSTODY_TRANSFERRED',
            timestamp: new Date().toISOString(),
            actor: approvedBy,
            details: {
                previousVehicleId,
                previousDriver,
                newVehicleId,
                newDriverName,
                reason
            }
        };

        parcel.events.push(transferEvent);

        await ctx.stub.putState(parcelId, Buffer.from(JSON.stringify(parcel)));
        console.info('============= END : Transfer Custody ===========');
        
        return JSON.stringify(parcel);
    }

    // Record out for delivery
    async outForDelivery(ctx, parcelId, driverName, estimatedDeliveryTime) {
        console.info('============= START : Out For Delivery ===========');

        const parcelAsBytes = await ctx.stub.getState(parcelId);
        if (!parcelAsBytes || parcelAsBytes.length === 0) {
            throw new Error(`Parcel ${parcelId} does not exist`);
        }

        const parcel = JSON.parse(parcelAsBytes.toString());
        
        if (parcel.status !== 'DISPATCHED' && parcel.status !== 'IN_TRANSIT') {
            throw new Error(`Parcel ${parcelId} cannot be marked out for delivery. Current status: ${parcel.status}`);
        }

        parcel.status = 'OUT_FOR_DELIVERY';
        parcel.updatedAt = new Date().toISOString();

        // Add out for delivery event
        const outForDeliveryEvent = {
            eventType: 'OUT_FOR_DELIVERY',
            timestamp: new Date().toISOString(),
            actor: driverName,
            details: {
                estimatedDeliveryTime
            }
        };

        parcel.events.push(outForDeliveryEvent);

        await ctx.stub.putState(parcelId, Buffer.from(JSON.stringify(parcel)));
        console.info('============= END : Out For Delivery ===========');
        
        return JSON.stringify(parcel);
    }

    // Record successful delivery
    async deliverParcel(ctx, parcelId, driverName, deliveryProofHash, customerSignatureHash) {
        console.info('============= START : Deliver Parcel ===========');

        const parcelAsBytes = await ctx.stub.getState(parcelId);
        if (!parcelAsBytes || parcelAsBytes.length === 0) {
            throw new Error(`Parcel ${parcelId} does not exist`);
        }

        const parcel = JSON.parse(parcelAsBytes.toString());
        
        if (parcel.status !== 'OUT_FOR_DELIVERY') {
            throw new Error(`Parcel ${parcelId} cannot be delivered. Current status: ${parcel.status}`);
        }

        parcel.status = 'DELIVERED';
        parcel.deliveredAt = new Date().toISOString();
        parcel.updatedAt = new Date().toISOString();

        // Add delivery event
        const deliveryEvent = {
            eventType: 'PARCEL_DELIVERED',
            timestamp: new Date().toISOString(),
            actor: driverName,
            details: {
                deliveryProofHash,
                customerSignatureHash,
                finalVehicleId: parcel.currentVehicleId,
                finalDriver: parcel.currentDriver
            }
        };

        parcel.events.push(deliveryEvent);

        await ctx.stub.putState(parcelId, Buffer.from(JSON.stringify(parcel)));
        console.info('============= END : Deliver Parcel ===========');
        
        return JSON.stringify(parcel);
    }

    // Record exception event
    async recordException(ctx, parcelId, exceptionType, description, reportedBy) {
        console.info('============= START : Record Exception ===========');

        const parcelAsBytes = await ctx.stub.getState(parcelId);
        if (!parcelAsBytes || parcelAsBytes.length === 0) {
            throw new Error(`Parcel ${parcelId} does not exist`);
        }

        const parcel = JSON.parse(parcelAsBytes.toString());
        parcel.updatedAt = new Date().toISOString();

        // Add exception event
        const exceptionEvent = {
            eventType: 'EXCEPTION',
            timestamp: new Date().toISOString(),
            actor: reportedBy,
            details: {
                exceptionType,
                description,
                currentStatus: parcel.status
            }
        };

        parcel.events.push(exceptionEvent);

        await ctx.stub.putState(parcelId, Buffer.from(JSON.stringify(parcel)));
        console.info('============= END : Record Exception ===========');
        
        return JSON.stringify(parcel);
    }

    // Query parcel by ID
    async queryParcel(ctx, parcelId) {
        const parcelAsBytes = await ctx.stub.getState(parcelId);
        if (!parcelAsBytes || parcelAsBytes.length === 0) {
            throw new Error(`Parcel ${parcelId} does not exist`);
        }
        return parcelAsBytes.toString();
    }

    // Query parcels by carrier
    async queryParcelsByCarrier(ctx, carrierName) {
        const queryString = {
            selector: {
                docType: 'parcel',
                carrierName: carrierName
            }
        };

        const iterator = await ctx.stub.getQueryResult(JSON.stringify(queryString));
        const results = await this._getAllResults(iterator);
        return JSON.stringify(results);
    }

    // Query parcel history (all events)
    async getParcelHistory(ctx, parcelId) {
        const iterator = await ctx.stub.getHistoryForKey(parcelId);
        const results = await this._getAllResults(iterator, true);
        return JSON.stringify(results);
    }

    // Helper function to get all results from iterator
    async _getAllResults(iterator, isHistory = false) {
        const allResults = [];
        let res = await iterator.next();
        
        while (!res.done) {
            if (res.value && res.value.value.toString()) {
                let jsonRes = {};
                
                if (isHistory && res.value.value && res.value.timestamp) {
                    jsonRes.TxId = res.value.tx_id;
                    jsonRes.Timestamp = res.value.timestamp;
                    jsonRes.IsDelete = res.value.is_delete.toString();
                    
                    try {
                        jsonRes.Value = JSON.parse(res.value.value.toString('utf8'));
                    } catch (err) {
                        jsonRes.Value = res.value.value.toString('utf8');
                    }
                } else {
                    jsonRes.Key = res.value.key;
                    
                    try {
                        jsonRes.Record = JSON.parse(res.value.value.toString('utf8'));
                    } catch (err) {
                        jsonRes.Record = res.value.value.toString('utf8');
                    }
                }
                
                allResults.push(jsonRes);
            }
            
            res = await iterator.next();
        }
        
        iterator.close();
        return allResults;
    }
}

module.exports = ParcelCustodyContract;