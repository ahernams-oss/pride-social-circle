ALTER TABLE public.event_attendances ADD COLUMN canceled_at timestamp with time zone;

CREATE POLICY "Users can cancel own attendance"
ON public.event_attendances
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);