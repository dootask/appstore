import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { ScrollArea } from "./ui/scroll-area"
import { useTranslation } from "react-i18next"
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { requestAPI } from "@dootask/tools";
import { eventEmit } from "@/lib/events";
import { Alert } from "@/components/custom/prompt";
import { useAppStore } from "@/lib/store"
import Select from "@/components/custom/select"

interface AppInstallProps {
  appName: string
  onClose?: () => void
}

export function AppInstall({appName, onClose}: AppInstallProps) {
  const {t} = useTranslation()
  const [installing, setInstalling] = useState(false)
  const {apps} = useAppStore();
  const app = apps.find(app => app.name === appName)

  if (!app) {
    return <div>App not found</div>
  }

  const formSchema = z.object({
    name: z.string(),
    version: z.string().min(1, {message: t('install.errors.version_required')}),
    cpuLimit: z.string()
      .min(1, {message: t('install.errors.cpu_required')})
      .refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
        message: t('install.errors.cpu_invalid')
      }),
    memoryLimit: z.string()
      .min(1, {message: t('install.errors.memory_required')})
      .refine((val) => {
        const normalized = val.toLowerCase().trim()
        if (/^\d+$/.test(normalized)) return true
        return /^\d+(m|mb|g|gb)$/.test(normalized)
      }, {
        message: t('install.errors.memory_invalid')
      }),
    ...app.info.fields.reduce((acc, field) => {
      const schema = field.type === "number"
        ? z.coerce.number()
        : z.string();

      return {
        ...acc,
        [field.name]: field.required
          ? schema.min(1, {message: t('install.errors.field_required', {field: field.label})})
          : schema.optional(),
      };
    }, {}),
  })

  type FormValues = z.infer<typeof formSchema>

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: app.info.name,
      version: app.versions[0]?.version || "",
      cpuLimit: app.config.resources.cpu_limit || "0",
      memoryLimit: app.config.resources.memory_limit || "0",
      ...Object.fromEntries(
        app.info.fields.map((field) => [field.name, field.default || ""])
      ),
    } as FormValues,
  })

  const onSubmit = (values: FormValues) => {
    // 提取 params 字段
    const params = app.info.fields.reduce((acc, field) => ({
      ...acc,
      [field.name]: values[field.name as keyof FormValues],
    }), {})

    // 构建提交数据
    const submitData = {
      version: values.version,
      params,
      resources: {
        cpu_limit: values.cpuLimit,
        memory_limit: values.memoryLimit,
      },
    }

    setInstalling(true)
    requestAPI({
      url: `apps/install`,
      method: 'post',
      data: Object.assign(submitData, {
        app_name: app.name,
      }),
    }).then(() => {
      eventEmit("refreshLog", app.name)
      onClose?.()
    }).catch((error) => {
      Alert({
        type: "warning",
        title: t('install.install_failed'),
        description: error.msg,
        showCancel: false,
        onConfirm: () => {
          setInstalling(false)
        }
      })
    }).finally(() => {
      setInstalling(false)
    })
  }

  return (
    <ScrollArea className="flex-1 h-0">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6 p-6">
          <div className="flex flex-col gap-5">
            <h3 className="text-lg font-medium text-foreground/90">{t('install.basic_info')}</h3>
            <div className="flex flex-col gap-5">
              <FormField
                control={form.control}
                name="name"
                render={({field}) => (
                  <FormItem className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:items-start">
                    <FormLabel className="sm:text-right min-h-9">{t('install.name')}</FormLabel>
                    <div className="sm:col-span-3">
                      <FormControl>
                        <Input {...field} disabled className="bg-muted"/>
                      </FormControl>
                      <FormMessage/>
                    </div>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="version"
                render={({field}) => (
                  <FormItem className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:items-start">
                    <FormLabel className="sm:text-right min-h-9">{t('install.version')}</FormLabel>
                    <div className="sm:col-span-3">
                      <FormControl>
                        <Select
                          {...field}
                          options={[
                            { id: 'latest', name: t('install.latest_version') },
                            ...app.versions.map(version => ({
                              id: version.version,
                              name: version.version
                            }))
                          ]}
                          defaultValue="latest"
                          onChange={(value) => field.onChange(value.id)}
                          placeholder={t('install.select_version')}
                        />
                      </FormControl>
                      <FormMessage/>
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </div>

          {app.info.fields.length > 0 && (
            <div className="flex flex-col gap-5">
              <h3 className="text-lg font-medium text-foreground/90">{t('install.app_config')}</h3>
              <div className="flex flex-col gap-5">
                {app.info.fields.map((field) => (
                  <FormField
                    key={field.name}
                    control={form.control}
                    name={field.name as keyof FormValues}
                    render={({field: formField}) => (
                      <FormItem className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:items-start">
                        <FormLabel className="sm:text-right min-h-9">{field.label}</FormLabel>
                        <div className="sm:col-span-3">
                          <FormControl>
                            {field.type === "select" ? (
                              <Select
                                options={field.options?.map(option => ({
                                  id: option.value,
                                  name: option.label
                                })) || []}
                                defaultValue={field.default?.toString()}
                                onChange={(value) => formField.onChange(value.id)}
                                placeholder={field.placeholder}
                              />
                            ) : (
                              <Input
                                {...formField}
                                type={field.type === "number" ? "number" : "text"}
                                placeholder={field.placeholder}
                              />
                            )}
                          </FormControl>
                          <FormMessage/>
                        </div>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-5">
            <h3 className="text-lg font-medium text-foreground/90">{t('install.resource_limit')}</h3>
            <div className="flex flex-col gap-5">
              <FormField
                control={form.control}
                name="cpuLimit"
                render={({field}) => (
                  <FormItem className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:items-start">
                    <FormLabel className="sm:text-right min-h-9">{t('install.cpu_limit')}</FormLabel>
                    <div className="sm:col-span-3">
                      <FormControl>
                        <Input {...field} placeholder={t('install.cpu_limit_placeholder')}/>
                      </FormControl>
                      <FormMessage/>
                    </div>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="memoryLimit"
                render={({field}) => (
                  <FormItem className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:items-start">
                    <FormLabel className="sm:text-right min-h-9">{t('install.memory_limit')}</FormLabel>
                    <div className="sm:col-span-3">
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={t('install.memory_limit_placeholder')}
                          onBlur={(e) => {
                            const value = e.target.value.toLowerCase().trim()
                            if (value === '0') return

                            const num = parseInt(value)
                            if (isNaN(num)) return

                            if (num > 0 && num <= 32) {
                              field.onChange(`${num}GB`)
                            } else if (num > 32) {
                              field.onChange(`${num}MB`)
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage/>
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            {(() => {
              const config = {
                className: "bg-green-100 text-green-700 hover:bg-green-200",
                label: t('install.title')
              }
              if (app.upgradeable) {
                Object.assign(config, {
                  className: "bg-purple-100 text-purple-700 hover:bg-purple-200",
                  label: t('install.upgrade_title')
                })
              } else if (app.config.status === 'installed') {
                Object.assign(config, {
                  className: "bg-green-100 text-green-700 hover:bg-green-200",
                  label: t('install.reinstall_title')
                })
              }
              return (
                <Button
                    type="submit"
                    className={`w-full sm:w-auto ${config.className}`}
                    disabled={installing}
                  >
                    {installing && (
                      <Loader2 className="animate-spin"/>
                    )}
                    {config.label}
                  </Button>
              );
            })()}
          </div>
        </form>
      </Form>
    </ScrollArea>
  )
}
