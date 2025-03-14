/**
 * Async await wrapper for easy error handling
 * @param { Promise } promise
 * @param { Object= } errorExt - Additional Information you can pass to the err object
 * @return {[ Promise.resolve, error ]}
 * 
     let err, user, savedTask;

     [ user, err ] = await awaitTo(UserModel.findById(1));
     if(!user) return cb('No user found');

     [ savedTask, err ] = await awaitTo(TaskModel({userId: user.id, name: 'Demo Task'}));
     if(err) return cb('Error occurred while saving task');

 */
export function awaitP<T, U = Error>(
    promise: Promise<T>,
    errorExt?: Record<string, any>
): Promise<[undefined, U] | [T, null]> {
    return promise
        .then<[T, null]>((data: T) => [data, null])
        .catch<[undefined, U]>((err: U) => {
            if (errorExt) {
                Object.assign(errorExt, err);
            }

            return [undefined, err];
        });
}

export default awaitP;
